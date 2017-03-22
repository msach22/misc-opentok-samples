//
//  base.swift
//  opentokswift
//
//  Created by rpc on 26/03/15.
//  Copyright (c) 2015 tokbox. All rights reserved.
//

import Foundation
import opentokc

public struct Opentok
{
    public static func start()
    {
        otc_init(nil)
    }
    
    public static func destroy()
    {
        otc_destroy()
    }
}
